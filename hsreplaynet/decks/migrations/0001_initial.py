# -*- coding: utf-8 -*-
# Generated by Django 1.10 on 2016-08-31 14:21
from __future__ import unicode_literals

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import hearthstone.enums
import hsreplaynet.decks.models
import hsreplaynet.utils.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('cards', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Deck',
            fields=[
                ('id', models.BigAutoField(primary_key=True, serialize=False)),
                ('hearthstone_id', models.BigIntegerField(null=True)),
                ('type', hsreplaynet.utils.fields.IntEnumField(verbose_name=hearthstone.enums.DeckType)),
                ('name', models.CharField(blank=True, max_length=64)),
                ('hero_overridden', models.BooleanField(default=False)),
                ('cardback_id', models.IntegerField(null=True)),
                ('cardback_overridden', models.BooleanField(default=False)),
                ('create_date', models.DateTimeField(null=True)),
                ('season_id', models.PositiveSmallIntegerField()),
                ('wild', models.BooleanField()),
                ('sort_order', models.PositiveSmallIntegerField(default=0)),
                ('source_type', hsreplaynet.utils.fields.IntEnumField(choices=[(0, 'UNKNOWN'), (1, 'NORMAL'), (2, 'TEMPLATE'), (3, 'DECK')], default=0, validators=[hsreplaynet.utils.fields.IntEnumValidator(hsreplaynet.decks.models.DeckSourceType)])),
                ('created', models.DateTimeField(auto_now_add=True)),
                ('updated', models.DateTimeField(auto_now=True)),
                ('cards', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to='cards.Deck')),
                ('user', models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
